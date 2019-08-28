declare module '*.svg' {
  import { AllHTMLAttributes } from 'react';
  const value: React.ComponentType<AllHTMLAttributes<SVGElement>>;
  export default value;
}
