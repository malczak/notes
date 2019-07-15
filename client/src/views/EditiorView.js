import React from 'react';
import moment from 'moment';
import classNames from 'classnames';
import T from 'prop-types';
import Box from 'ui-box';

import debounce from 'lodash.debounce';
import pick from 'lodash.pick';

// Components
import Loadable from 'app/views/Loadable';
import TextEditor from 'app/views/components/TextEditor';
import Spinner from 'app/views/components/Spinner';
import ButtonLink from 'app/views/components/ButtonLink';

// Icons
import IconBack from 'assets/chevron-left.svg';
import IconUploadCloud from 'assets/upload-cloud.svg';
import IconUploadError from 'assets/cloud-lightning.svg';

// Css
import styles from './EditiorView.less';

import { inject } from 'mobx-react';
import { observable, action } from 'mobx';

const IconStatus = ({ text, IconClass, ...others }) => {
    return (
        <Box display="flex" alignItems="center" {...others}>
            {text && <small>{text}</small>}
            <Box is="svg" marginX="0.3em" viewBox="0 0 20 20">
                <IconClass width="100%" height="100%" />
            </Box>
        </Box>
    );
};

class SinceDate extends React.PureComponent {
    static propTypes = {
        text: T.string,
        date: T.oneOfType([T.object, T.string]).isRequired
    };

    interval = null;

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
    @observable dirty = false;

    @observable.ref state = Loadable.empty();

    constructor(client) {
        this.client = client;
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
        return this.state.isError;
    }

    @computed
    get isReady() {
        return this.state.isReady;
    }

    @action
    setDirty(value) {
        this.dirty = value;
    }

    @action
    setState(state) {
        this.state = state;
    }

    async saveFile(file) {
        if (this.isLoading) {
            return;
        }

        this.setState(Loadable.loading());

        try {
            const data = await this.client.saveFile(file);
            this.setState(Loadable.available(data));
        } catch (err) {
            this.setState(Loadable.error(err));
        }

        this.setDirty(false);
    }
}

@observer
class BackButton extends React.Component {
    static propTypes = {
        store: T.instanceOf(FileSaveStore).isRequired
    };

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
class SaveButton extends React.Component {
    static propTypes = {
        store: T.instanceOf(FileSaveStore).isRequired,
        onClick: T.func
    };

    // -----------------------
    // Render
    // -----------------------
    renderLastModified() {
        const store = this.props.store;

        if (store.isReady) {
            const { lastModified } = store.data;
            if (lastModified) {
                return (
                    <SinceDate
                        className={styles.lastModified}
                        date={lastModified}
                    />
                );
            }
        }

        return null;
    }

    render() {
        const store = this.props.store;

        if (store.isError) {
            return (
                <IconStatus
                    IconClass={IconUploadError}
                    className={styles.saveStatusBar}
                />
            );
        }

        if (store.isLoading) {
            return (
                <IconStatus
                    text={'Saving file'}
                    IconClass={Spinner}
                    flexDirection="row-reverse"
                />
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
class DirtyDot extends React.Component {
    static propTypes = {
        store: T.instanceOf(FileSaveStore).isRequired
    };

    // -----------------------
    // Render
    // -----------------------
    render() {
        const store = this.props.store;
        if (store.dirty) {
            return <Box className={styles.dirtyDot} />;
        }

        return null;
    }
}

class Input extends React.Component {
    constructor(props) {
        super(props);
        this.state = { text: props.text || '' };
        this.inputRef = React.createRef();
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

@inject('rootStore', 'appSync')
@observer
class EditiorView extends React.Component {
    state = { ready: false, file: undefined };

    initialFile = null;

    fileSaveStore = null;

    titleRef = React.createRef();

    editorRef = React.createRef();

    constructor(props) {
        super(props);

        this.createStore();
    }

    get client() {
        return this.props.appSync.client;
    }

    get fileId() {
        const { params = {} } = this.props.match;
        const { id: fileId } = params;
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

            this.setState({
                file: Object.assign(
                    pick(file, ['id', 'title', 'lastModified']),
                    {
                        content
                    }
                )
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

        const file = {
            id: this.fileId,
            ...(titleInput && {
                title: titleInput.getText()
            }),
            ...(editorInput && {
                content: editorInput.getJSONString()
            })
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

    onDeleteFile = file => {
        this.props.rootStore.deleteFile(file);
    };

    // -----------------------
    // Window close
    // -----------------------

    addLeavePrompt() {
        if ('onbeforeunload' in window) {
            window.onbeforeunload = this.showLeavePrompt;
        } else {
            window.addEventListener('onbeforeunload', this.showLeavePrompt);
        }
    }

    removeLeavePrompt() {
        if ('onbeforeunload' in window) {
            window.onbeforeunload = null;
        } else {
            window.removeEventListener('onbeforeunload', this.showLeavePrompt);
        }
    }

    showLeavePrompt = e => {
        e.preventDefault();
        var confirmationMessage = 'Please wait for data to be saved.';
        (e || window.event).returnValue = confirmationMessage;
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
                <div className={classNames(styles.editorView, styles.centered)}>
                    <p>Loading</p>
                </div>
            );
        }

        return (
            <div className={styles.editorView}>
                <Input
                    ref={this.titleRef}
                    className={styles.titleInput}
                    text={file.title || ''}
                    onChange={this.onContentChange}
                />
                <TextEditor
                    className={styles.textEditor}
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
            <Box className={styles.mainView}>
                <Box className={styles.header} display="flex">
                    <Box flex={1}>
                        <BackButton store={this.fileSaveStore} />
                    </Box>
                    <SaveButton
                        store={this.fileSaveStore}
                        onClick={this.onSaveClick}
                    />
                </Box>
                {this.renderContent()}
            </Box>
        );
    }
}

export default EditiorView;
