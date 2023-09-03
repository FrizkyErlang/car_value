import { BadRequestException } from '@nestjs/common/exceptions';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User } from './users.entity';

describe('AuthService', () => {
  let service: AuthService;
  let fakeUsersService: Partial<UsersService>;

  beforeEach(async () => {
    // Create a fake copy of users service
    const users: User[] = [];
    fakeUsersService = {
      find: (email: string) => {
        const filteredUsers = users.filter((user) => user.email === email);
        return Promise.resolve(filteredUsers);
      },
      create: (email: string, password: string) => {
        const user = {
          id: Math.floor(Math.random() * 999999),
          email,
          password,
        } as User;
        users.push(user);
        return Promise.resolve(user);
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: fakeUsersService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('can create an instance of auth service', async () => {
    expect(service).toBeDefined();
  });

  it('create a new user with a salted and hashed password', async () => {
    const user = await service.signup('testemail@test.com', 'testpass123');

    expect(user.password).not.toEqual('testpass123');
    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('throws an error if user sign up with email that is in use', async () => {
    await service.signup('usedemail@test.com', 'testpass123first');

    await expect(
      service.signup('usedemail@test.com', 'testpass123second'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws an error if sign in with unused email', async () => {
    await expect(
      service.signin('unusedemail@test.com', 'testpass123'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws an error if user sign in with invalid password', async () => {
    await service.signup('invalidpass@test.com', 'testpass123true');

    await expect(
      service.signin('invalidpass@test.com', 'testpass123false'),
    ).rejects.toThrow(BadRequestException);
  });

  it('return a user if sign in with correct password', async () => {
    await service.signup('validpass@test.com', 'testpass123');

    const user = await service.signin('validpass@test.com', 'testpass123');
    expect(user).toBeDefined();
  });
});
