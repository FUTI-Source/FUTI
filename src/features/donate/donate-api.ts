import type {
  CreateDonationRequest,
  CreateDonationResponse,
  DonateConfig,
  DonateErrorBody,
  DonationStatusResponse,
} from './types';

export class DonateError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'DonateError';
  }
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new DonateError('网络异常，请稍后重试', 0);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (data as DonateErrorBody | null)?.error;
    throw new DonateError(
      error?.message ?? '请求失败，请稍后重试',
      response.status,
      error?.code,
    );
  }

  return data as T;
}

export async function fetchDonateConfig(): Promise<DonateConfig> {
  return requestJson<DonateConfig>('/api/donate/config');
}

export function createDonation(input: CreateDonationRequest): Promise<CreateDonationResponse> {
  return requestJson<CreateDonationResponse>('/api/donate/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function queryDonation(token: string): Promise<DonationStatusResponse> {
  return requestJson<DonationStatusResponse>(
    `/api/donate/status?token=${encodeURIComponent(token)}`,
  );
}
