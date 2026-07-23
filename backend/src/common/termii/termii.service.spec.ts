import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TermiiService } from './termii.service';

describe('TermiiService', () => {
  let service: TermiiService;
  let configService: { get: jest.Mock };
  let fetchMock: jest.Mock;

  const config: Record<string, string> = {
    termiiApiKey: 'test-api-key',
    termiiBaseUrl: 'https://v4.api.termii.com',
    termiiSenderId: 'Termii',
    termiiChannel: 'generic',
  };

  beforeEach(async () => {
    configService = { get: jest.fn((key: string) => config[key]) };
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [TermiiService, { provide: ConfigService, useValue: configService }],
    }).compile();

    service = module.get<TermiiService>(TermiiService);
  });

  it('posts to /api/sms/send with the expected Termii payload, stripping a leading +', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ code: 'ok', message: 'Successfully Sent' }),
    });

    await service.sendSms('+2348022223333', 'You have a new assignment');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://v4.api.termii.com/api/sms/send',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          api_key: 'test-api-key',
          to: '2348022223333',
          from: 'Termii',
          sms: 'You have a new assignment',
          type: 'plain',
          channel: 'generic',
        }),
      }),
    );
  });

  it('does not throw when Termii is not configured — logs and returns instead', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'termiiApiKey' ? undefined : config[key],
    );

    await expect(service.sendSms('+2348022223333', 'hi')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not throw when Termii responds with a non-ok status', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ code: 'error', message: 'Invalid api key' }),
    });

    await expect(service.sendSms('+2348022223333', 'hi')).resolves.toBeUndefined();
  });

  it('does not throw when fetch itself rejects (network error)', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(service.sendSms('+2348022223333', 'hi')).resolves.toBeUndefined();
  });
});
