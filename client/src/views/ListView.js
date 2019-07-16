import React from 'react';
import moment from 'moment';
import { Link } from 'react-router-dom';
import Box from 'ui-box';

import Spinner from 'app/views/components/Spinner';

import styles from './ListView.less';

import IconTrash from 'assets/trash-2.svg';
import IconClock from 'assets/clock.svg';
import IconNewFile from 'assets/file-plus.svg';
import IconGithub from 'assets/github.svg';
import IconMail from 'assets/at-sign.svg';
import AppIcon from 'assets/appicon.svg';

const FilesList = ({ files, onDeleteClick }) => {
    const format = date => moment(date).format('MMMM Do YYYY, h:mm:ss a');

    const FileItem = ({ file, onDeleteClick }) => (
        <li>
            <Link to={`/edit/${file.id}`}>
                <div>{file.title}</div>
                <Box display="flex" className={styles.info}>
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
            </Link>
        </li>
    );

    return (
        <div className={styles.listWrapper}>
            <ul>
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
class ListView extends React.Component {
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

    onDeleteFile = file => {
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
            <div className={styles.filesList}>
                <nav>
                    <div>
                        <AppIcon width={24} height={24} />
                        <span>Notes</span>
                    </div>
                    <hr />
                    <div className={styles.actions}>
                        <button onClick={this.onCreateFile}>
                            <IconNewFile />
                            <span>New note</span>
                        </button>
                        <div className={styles.spacer} />
                        <button onClick={this.onFeedbackClick}>
                            <IconMail />
                        </button>
                        <button onClick={this.onGithubClick}>
                            <IconGithub />
                        </button>
                    </div>
                    <hr />
                </nav>

                {files ? (
                    <FilesList
                        files={files}
                        onDeleteClick={this.onDeleteFile}
                    />
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

export default ListView;
