// Core
import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { observer, inject } from 'mobx-react';
import Box from 'ui-box';

// Views
import EditorView from 'app/views/EditorView';
import ListView from 'app/views/ListView';
import LoginView from 'app/views/LoginView';
import Spinner from 'app/views/components/Spinner';

// Styles
import { StoreProps } from 'app/stores/ApplicationStore';

const Loader = () => (
  <Box
    display="flex"
    alignItems="center"
    justifyContent="center"
    position="absolute"
    width="100%"
    height="100%"
  >
    <Spinner variant="large" />
  </Box>
);

@inject('appSync')
@observer
class MainView extends React.Component<StoreProps> {
  // -----------------------
  // Render
  // -----------------------
  render() {
    // make sure both @computed props are called
    const authorized = this.props.appSync.authorized;
    const initialized = this.props.appSync.isReady;

    if (!authorized) {
      return <LoginView />;
    }

    if (!initialized) {
      return <Loader />;
    }

    return (
      <Router>
        <div className="app-container">
          <Route exact={true} path="/" component={ListView} />
          <Route path="/edit/:id" component={EditorView} />
        </div>
      </Router>
    );
  }
}

export default MainView;
