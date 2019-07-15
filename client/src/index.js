import React from 'react';
import ReactDOM from 'react-dom';
import { configure } from 'mobx';
import { AppContainer } from 'react-hot-loader';
import App from './App';

configure({ enforceActions: 'always', isolateGlobalState: true });

const render = Component => {
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
