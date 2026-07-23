import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProtocolMembersController } from './protocol-members.controller';
import { ProtocolMembersService } from './protocol-members.service';
import { ProtocolMember, ProtocolMemberSchema } from './schemas/protocol-member.schema';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProtocolMember.name, schema: ProtocolMemberSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [ProtocolMembersController],
  providers: [ProtocolMembersService],
  exports: [ProtocolMembersService],
})
export class ProtocolMembersModule {}
