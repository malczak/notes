import React from 'react';
import moment from 'moment';
import { observer, inject } from 'mobx-react';
import { Link, withRouter, RouteComponentProps } from 'react-router-dom';
import Box from 'ui-box';

import Spinner from 'app/views/components/Spinner';

//@ts-ignore
import IconTrash from 'assets/trash-2.svg';
import IconClock from 'assets/clock.svg';
import IconNewFile from 'assets/file-plus.svg';
import IconGithub from 'assets/github.svg';
import IconMail from 'assets/at-sign.svg';
import AppIcon from 'assets/appicon.svg';
import { StoreProps } from 'app/stores/ApplicationStore';
import { File } from 'app/gql/types';

const FilesList: React.FC<{
  files: File[];
  onDeleteClick: (file: File) => void;
}> = ({ files, onDeleteClick }) => {
  const format = (date: number) =>
    moment(date).format('MMMM Do YYYY, h:mm:ss a');

  const FileItem: React.FC<{ file: File; onDeleteClick: () => void }> = ({
    file,
    onDeleteClick
  }) => (
    <li className="filesitem">
      <Link to={`/edit/${file.id}`}>
        <div>{file.title}</div>
      </Link>
      <Box display="flex" className="filesitem__info">
        <a
          onClick={evt => {
            evt.preventDefault();
            onDeleteClick();
          }}
        >
          <IconTrash />
        </a>
        <span>
          <IconClock />
        </span>
        <Box is="span" marginRight="0.5em">
          {format(file.lastModified)}
        </Box>
      </Box>
    </li>
  );

  return (
    <div className="fileslist">
      <ul className="fileslist__content">
        {files.map(file => (
          <FileItem
            key={file.id}
            file={file}
            onDeleteClick={() => {
              onDeleteClick(file);
            }}
          />
        ))}
      </ul>
    </div>
  );
};

@inject('rootStore', 'appSync')
@observer
class ListView extends React.Component<StoreProps & RouteComponentProps> {
  get client() {
    return this.props.appSync;
  }

  // -----------------------
  // Handlers
  // -----------------------
  onFeedbackClick = () => {};

  onGithubClick = () => {};

  onCreateFile = () => {
    this.client.createFile().then(file => {
      const id = file.id;
      this.props.history.push(`/edit/${id}`);
    });
  };

  onDeleteFile = (file: File) => {
    this.props.rootStore.deleteFile(file);
  };

  // -----------------------
  // Lifecycle
  // -----------------------
  componentDidMount() {
    this.client.fetchMemos();
  }

  // -----------------------
  // Render
  // -----------------------
  render() {
    const files = this.client.files;
    return (
      <div className="filescontainer">
        <nav>
          <div>
            <AppIcon width={24} height={24} />
            <span>Notes</span>
          </div>
          <hr />
          <div className="fileactions">
            <button className="fileactions__button" onClick={this.onCreateFile}>
              <IconNewFile />
              <span>New note</span>
            </button>
            <div className="fileactions__spacer" />
            <button
              className="fileactions__button"
              onClick={this.onFeedbackClick}
            >
              <IconMail />
            </button>
            <button
              className="fileactions__button"
              onClick={this.onGithubClick}
            >
              <IconGithub />
            </button>
          </div>
          <hr />
        </nav>

        {files ? (
          <FilesList files={files} onDeleteClick={this.onDeleteFile} />
        ) : (
          <div>
            <Spinner variant="tiny" />
            Loading
          </div>
        )}
      </div>
    );
  }
}

export default withRouter(ListView);
