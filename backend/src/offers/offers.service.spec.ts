import { Test, type TestingModule } from '@nestjs/testing';
import { OffersService } from './offers.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

describe('OffersService.buildConditionLabel', () => {
  let service: OffersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: PrismaService, useValue: {} },
        { provide: RealtimeService, useValue: { publish: jest.fn() } },
      ],
    }).compile();
    service = module.get(OffersService);
  });

  it('reads as "Anytime today" for a wide window (>= 5 hours)', () => {
    expect(
      service.buildConditionLabel(
        { startTime: '12:00', endTime: '22:00' },
        '13:00',
      ),
    ).toBe('Anytime today');
  });

  it('reads as "Arrive before X" when currently inside a narrow window', () => {
    expect(
      service.buildConditionLabel(
        { startTime: '15:00', endTime: '17:00' },
        '16:00',
      ),
    ).toBe('Arrive before 5:00 PM');
  });

  it('reads as a literal time range for a narrow window still in the future', () => {
    expect(
      service.buildConditionLabel(
        { startTime: '17:00', endTime: '19:00' },
        '13:00',
      ),
    ).toBe('5:00 PM – 7:00 PM');
  });
});
