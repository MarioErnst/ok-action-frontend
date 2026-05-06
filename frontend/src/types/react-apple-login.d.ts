declare module 'react-apple-login' {
  import React from 'react';
  export interface AppleLoginProps {
    clientId: string;
    redirectURI: string;
    usePopup?: boolean;
    callback?: (response: any) => void;
    scope?: string;
    state?: string;
    nonce?: string;
    responseMode?: string;
    responseType?: string;
    render?: (props: { onClick: () => void; disabled?: boolean }) => React.ReactNode;
  }
  const AppleLogin: React.FC<AppleLoginProps>;
  export default AppleLogin;
}