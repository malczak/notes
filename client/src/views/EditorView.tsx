import React from 'react';
import { action, computed, observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import moment from 'moment';
import Box from 'ui-box';
import { withRouter, RouteComponentProps } from 'react-router';

import debounce from 'lodash.debounce';

// Components
import Loadable from 'app/views/Loadable';
import TextEditor from 'app/views/components/TextEditor';
import Spinner from 'app/views/components/Spinner';
import ButtonLink from 'app/views/components/ButtonLink';

// Icons
import IconBack from 'assets/chevron-left.svg';
import IconUploadCloud from 'assets/upload-cloud.svg';
import IconUploadError from 'assets/cloud-lightning.svg';

// Stores
import { StoreProps } from 'app/stores/ApplicationStore';
import { AppSyncStore } from 'app/stores/AppSyncStore';

// Types
import { File } from 'app/gql/types';

const IconStatus: React.FC<{
  text?: string;
  className?: string;
  reverse?: boolean;
  IconClass: any;
}> = ({ text, reverse, IconClass, ...others }) => {
  return (
    <Box
      display="flex"
      flexDirection={reverse === true ? 'row-reverse' : 'row'}
      alignItems="center"
      {...others}
    >
      {text && <small>{text}</small>}
      <Box is="svg" marginX="0.3em" viewBox="0 0 20 20">
        <IconClass width="100%" height="100%" />
      </Box>
    </Box>
  );
};

class SinceDate extends React.PureComponent<{
  className: string;
  text?: string;
  date: Date | string | number;
}> {
  private interval?: any;

  // Lifecycle
  componentDidMount() {
    this.interval = setInterval(() => this.forceUpdate(), 1000);
  }

  componentWillUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  // Render
  render() {
    const { text = 'Saved', date, className } = this.props;
    if (!(date instanceof Date) && !(typeof date == 'string')) {
      return null;
    }

    return (
      <small className={className}>
        {text} {moment(date).fromNow()}
      </small>
    );
  }
}

class FileSaveStore {
  @observable dirty: boolean;

  @observable.ref state: Loadable<File>;

  private syncStore: AppSyncStore;

  constructor(client: AppSyncStore) {
    this.syncStore = client;
    this.setDirty(false);
    this.setState(Loadable.empty());
  }

  get data() {
    return this.state.value;
  }

  @computed
  get isLoading() {
    return this.state.isLoading;
  }

  @computed
  get isError() {
    return this.state.hasError;
  }

  @computed
  get isReady() {
    return this.state.isReady;
  }

  @action
  setDirty(value: boolean) {
    this.dirty = value;
  }

  @action
  setState(state: Loadable<File>) {
    this.state = state;
  }

  async saveFile(file: File) {
    if (this.isLoading) {
      return;
    }

    this.setState(Loadable.loading());

    try {
      const data = await this.syncStore.saveFile(file);
      this.setState(Loadable.available(data));
    } catch (err) {
      this.setState(Loadable.error(err));
    }

    this.setDirty(false);
  }
}

type FileSaveStoreProps = {
  store: FileSaveStore;
};

@observer
class BackButton extends React.Component<FileSaveStoreProps> {
  // -----------------------
  // Render
  // -----------------------
  render() {
    const store = this.props.store;
    const disableButton = store.isLoading || store.isError;
    return (
      <ButtonLink to="/" disabled={disableButton}>
        <IconBack /> <span>Back</span>
      </ButtonLink>
    );
  }
}

@observer
class SaveButton extends React.Component<
  FileSaveStoreProps & { onClick: () => void }
> {
  // -----------------------
  // Render
  // -----------------------
  renderLastModified() {
    const store = this.props.store;

    if (store.isReady) {
      const { lastModified } = store.data;
      if (lastModified) {
        return (
          <SinceDate className="header__lastModified" date={lastModified} />
        );
      }
    }

    return null;
  }

  render() {
    const store = this.props.store;

    if (store.isError) {
      return <IconStatus IconClass={IconUploadError} />;
    }

    if (store.isLoading) {
      return (
        <IconStatus text={'Saving file'} IconClass={Spinner} reverse={true} />
      );
    }

    return (
      <Box display="flex" alignItems="center">
        {this.renderLastModified()}
        <button onClick={this.props.onClick}>
          <IconUploadCloud />
          <span>Save</span>
        </button>
      </Box>
    );
  }
}

@observer
class DirtyDot extends React.Component<FileSaveStoreProps> {
  // -----------------------
  // Render
  // -----------------------
  render() {
    const store = this.props.store;
    if (store.dirty) {
      return <Box className="editorview__dirtyDot" />;
    }

    return null;
  }
}

type InputTextType = { text: string };
class Input extends React.Component<
  InputTextType & { className: string; onChange: (text: string) => void },
  InputTextType
> {
  inputRef = React.createRef<HTMLInputElement>();

  state = { text: '' };

  constructor(props: InputTextType) {
    super(props as any);
    this.state.text = props.text || '';
  }

  getText() {
    return this.state.text;
  }

  onChange = () => {
    const inputEl = this.inputRef.current;
    if (!inputEl) {
      return;
    }

    const text = inputEl.value;
    if (this.state.text == text) {
      return;
    }

    this.setState({ text }, () => {
      this.props.onChange(text);
    });
  };

  // Render
  render() {
    const { className } = this.props;
    return (
      <input
        ref={this.inputRef}
        value={this.state.text}
        onChange={this.onChange}
        placeholder="Note title..."
        className={className}
      />
    );
  }
}

type EditorViewState = {
  ready: boolean;
  file?: File;
};

@inject('rootStore', 'appSync')
@observer
class EditorView extends React.Component<
  StoreProps & RouteComponentProps,
  EditorViewState
> {
  state: EditorViewState = { ready: false };

  private fileSaveStore: FileSaveStore = null;

  private titleRef = React.createRef<Input>();

  private editorRef = React.createRef<TextEditor>();

  constructor(props: any) {
    super(props);

    this.createStore();
  }

  get client() {
    return this.props.appSync.client;
  }

  get fileId() {
    const params = this.props.match.params as any;
    const fileId = params.id;
    return fileId;
  }

  createStore() {
    this.fileSaveStore = new FileSaveStore(this.props.appSync);
  }

  // Get initial value
  fetchContent() {
    this.props.appSync.fetchMemo(this.fileId).then(file => {
      let content = '';
      try {
        content = JSON.parse(file.content);
      } catch (err) {
        content = file.content;
      }

      const newFile: File = {
        id: file.id,
        title: file.title,
        lastModified: file.lastModified,
        content
      };

      this.setState({
        file: newFile
      });
    });
  }

  // -----------------------
  // Saving
  // -----------------------

  saveStarted() {}

  saveCompleted() {}

  async saveContent() {
    if (this.fileSaveStore.isLoading) {
      return;
    }

    const titleInput = this.titleRef.current;
    const editorInput = this.editorRef.current;

    const file: File = {
      id: this.fileId,
      ...(titleInput && {
        title: titleInput.getText()
      }),
      ...(editorInput && {
        content: editorInput.getJSONString()
      }),
      lastModified: 0
    };

    this.addLeavePrompt();
    this.saveStarted();

    try {
      await this.fileSaveStore.saveFile(file);
    } catch (err) {
      console.log(err);
    }

    this.saveCompleted();
    this.removeLeavePrompt();
  }

  autosaveContent = debounce(() => {
    this.saveContent();
  }, 2000);

  // -----------------------
  // Handlers
  // -----------------------

  onContentChange = () => {
    this.fileSaveStore.setDirty(true);
    this.autosaveContent();
  };

  onSaveClick = () => {
    this.saveContent();
  };

  onDeleteFile = () => {
    const { file } = this.state;
    if (file) {
      this.props.rootStore.deleteFile(file).then(() => {
        const { history } = this.props;
        if (history) {
          history.push('/');
        }
      });
    }
  };

  // -----------------------
  // Window close
  // -----------------------

  addLeavePrompt() {
    if ('onbeforeunload' in window) {
      window.onbeforeunload = this.showLeavePrompt;
    } else {
      (window as any).addEventListener('onbeforeunload', this.showLeavePrompt);
    }
  }

  removeLeavePrompt() {
    if ('onbeforeunload' in window) {
      window.onbeforeunload = null;
    } else {
      (window as any).removeEventListener(
        'onbeforeunload',
        this.showLeavePrompt
      );
    }
  }

  showLeavePrompt = (e: Event) => {
    e.preventDefault();
    let confirmationMessage = 'Please wait for data to be saved.';
    ((e || window.event) as any).returnValue = confirmationMessage;
    return confirmationMessage;
  };

  // -----------------------
  // Lifecycle
  // -----------------------

  componentDidMount() {
    // I'm using direct query to walkaround Query rerender on cache updates
    this.fetchContent();
  }

  // -----------------------
  // Render
  // -----------------------

  renderContent() {
    const { file } = this.state;

    if (!file) {
      return (
        <div className="editorview editorview--centered">
          <p>Loading</p>
        </div>
      );
    }

    return (
      <div className="editorview">
        <Input
          ref={this.titleRef}
          className="editorview__titleInput"
          text={file.title || ''}
          onChange={this.onContentChange}
        />
        <TextEditor
          ref={this.editorRef}
          value={file.content || ''}
          onChange={this.onContentChange}
          onDeleteClick={this.onDeleteFile}
        />
        <DirtyDot store={this.fileSaveStore} />
      </div>
    );
  }

  render() {
    return (
      <Box className="editorview-wrapper">
        <Box className="editorview-wrapper__header" display="flex">
          <Box flex={1}>
            <BackButton store={this.fileSaveStore} />
          </Box>
          <SaveButton store={this.fileSaveStore} onClick={this.onSaveClick} />
        </Box>
        {this.renderContent()}
      </Box>
    );
  }
}

export default withRouter(EditorView);
