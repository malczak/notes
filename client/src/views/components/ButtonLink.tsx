/* eslint-disable no-unused-vars */
import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router';

const LinkButton: React.FC<
  RouteComponentProps & {
    to: string;
    disabled: boolean;
    onClick?: (evt: React.MouseEvent) => void;
  }
> = props => {
  const {
    history,
    location,
    match,
    staticContext,
    to,
    onClick,
    ...rest
  } = props;
  return (
    <button
      {...rest} // `children` is just another prop!
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick && onClick(event);
        history.push(to);
      }}
    />
  );
};

export default withRouter(LinkButton);
