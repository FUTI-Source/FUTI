export interface ContactRequest {
  email: string;
  content: string;
}

export interface ContactResponse {
  success: true;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
