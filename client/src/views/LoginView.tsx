import React from 'react';
import { observer, inject } from 'mobx-react';

import { StoreProps } from 'app/stores/ApplicationStore';

type LoginViewProps = {};

type LoginViewState = {
  password: string;
  error: string | null;
  busy: boolean;
};

@inject('appSync')
@observer
class LoginView extends React.Component<
  StoreProps & LoginViewProps,
  LoginViewState
> {
  state = { password: '', error: '', busy: false };

  inputRef = React.createRef<HTMLInputElement>();

  private hideErrorTid?: any;

  isLoginButtonEnabled() {
    const { password, busy } = this.state;
    return password && password.length && !busy;
  }

  // -----------------------
  // Handlers
  // -----------------------
  onKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key == 'Enter') {
      evt.preventDefault();
      if (this.isLoginButtonEnabled()) {
        this.onLoginClick();
      }
    }
  };

  onLoginClick = () => {
    this.setState({ busy: true });
    this.props.appSync.signIn(this.state.password).catch(error => {
      this.setError('Ups... 🚫');
      this.setState({ busy: false });
    });
  };

  setError(error: string) {
    if (this.hideErrorTid) {
      clearTimeout(this.hideErrorTid);
    }

    this.setState({ password: '', error }, () => {
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
      <div className="loginview">
        <p className="loginview__title">Wydatki</p>
        <input
          ref={this.inputRef}
          className="loginview__input"
          placeholder="password"
          type="password"
          value={password}
          onChange={evt => this.setState({ password: evt.target.value })}
          onKeyDown={this.onKeyDown}
          {...(busy ? { disabled: true } : null)}
        />
        <button
          className="loginview__button"
          onClick={this.onLoginClick}
          {...(!this.isLoginButtonEnabled() ? { disabled: true } : null)}
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
