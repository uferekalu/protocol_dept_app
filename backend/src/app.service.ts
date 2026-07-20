import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'protocol-department-api',
      timestamp: new Date().toISOString(),
    };
  }
}
