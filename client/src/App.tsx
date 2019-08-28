// Runtime include
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Core
import React from 'react';
import { Provider } from 'mobx-react';

// Views
import MainView from 'app/views/MainView';
import { ErrorBoundary } from 'app/utils/error';

// stores
import { ApplicationStore } from 'app/stores/ApplicationStore';

const rootStore = new ApplicationStore();

/**
 * Application container
 */
export const App: React.FC = () => (
  <ErrorBoundary>
    <Provider {...rootStore.toObject()}>
      <MainView />
    </Provider>
  </ErrorBoundary>
);
