// Environment variables configuration
declare const process: {
  env: {
    REACT_APP_API_KEY: string;
    [key: string]: string | undefined;
  }
};

export const env = {
  REACT_APP_API_KEY: process.env.REACT_APP_API_KEY || 'default_api_key',
};
