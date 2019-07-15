import React from 'react';
import { observer, inject } from 'mobx-react';

import styles from './LoginView.less';

@inject('appSync')
@observer
class LoginView extends React.Component {
    inputRef = React.createRef();

    state = { password: '', error: null, busy: false };

    // -----------------------
    // Handlers
    // -----------------------
    onLoginClick = () => {
        this.setState({ busy: true });
        this.props.appSync.signIn(this.state.password).catch(error => {
            this.setError('Ups... 🚫');
            this.setState({ busy: false });
        });
    };

    setError(error) {
        if (this.hideErrorTid) {
            clearTimeout(this.hideErrorTid);
        }

        this.setState({ error }, () => {
            this.hideErrorTid = setTimeout(
                () => this.setState({ error: null }),
                2000 + 100 * error.length
            );
        });
    }

    // -----------------------
    // Lifecycle
    // -----------------------
    componentDidMount() {
        this.inputRef.current.focus();
    }

    // -----------------------
    // Render
    // -----------------------
    render() {
        const { password, busy, error } = this.state;
        return (
            <div className={styles.loginView}>
                <h5>My notes</h5>
                <input
                    ref={this.inputRef}
                    placeholder="password"
                    type="text"
                    value={password}
                    onChange={evt =>
                        this.setState({ password: evt.target.value })
                    }
                    {...(busy ? { disabled: 1 } : null)}
                />
                <button
                    onClick={this.onLoginClick}
                    {...(!password || !password.length || busy
                        ? { disabled: 1 }
                        : null)}
                >
                    Login
                </button>
                {error && (
                    <div>
                        <small>{error}</small>
                    </div>
                )}
            </div>
        );
    }
}

export default LoginView;
