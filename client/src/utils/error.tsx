// Core
import React from 'react';

// -----------------------
// Default fallback component when bugsnag is not enabled
// -----------------------
export class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: any) {
    console.log(error, info);
  }

  render() {
    return this.props.children;
  }
}

const errorNotifier = (error: Error) => console.error('Error:', error);

export default errorNotifier;
