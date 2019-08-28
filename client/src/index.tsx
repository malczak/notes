import React from 'react';
import ReactDOM from 'react-dom';
import { configure } from 'mobx';
import { AppContainer } from 'react-hot-loader';

import { App } from './App';

import './less/index.less';

declare let module: any;

configure({ enforceActions: 'always', isolateGlobalState: true });

const render = (Component: React.ComponentType) => {
  ReactDOM.render(
    <AppContainer>
      <Component />
    </AppContainer>,
    document.getElementById('root')
  );
};

render(App);

if (module.hot) {
  module.hot.accept('./App', () => render(App));
}
