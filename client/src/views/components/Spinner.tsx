import React from 'react';

const VariantSize: { [size: string]: number } = {
  tiny: 12,
  xsmall: 16,
  small: 24,
  normal: 32,
  large: 48,
  xlarge: 52
};

// Taken from : https://github.com/SamHerbert/SVG-Loaders
const Spinner = ({
  variant = 'xsmall',
  width = 38,
  height = 38,
  color = '#444',
  strokeWidth = 2
}) => {
  // By Sam Herbert (@sherb), for everyone. More @ http://goo.gl/7AJzbL

  if (variant) {
    width = height = VariantSize[variant] || 16;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 38 38"
      xmlns="http://www.w3.org/2000/svg"
      stroke={color}
    >
      <g fill="none" fillRule="evenodd">
        <g transform="translate(1 1)" strokeWidth={strokeWidth}>
          <circle strokeOpacity=".2" cx="18" cy="18" r="18" />
          <path d="M36 18c0-9.94-8.06-18-18-18" strokeLinecap="round">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 18 18"
              to="360 18 18"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      </g>
    </svg>
  );
};
export default Spinner;
