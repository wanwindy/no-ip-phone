import 'package:client/core/constants/app_constants.dart';
import 'package:client/features/admin/data/admin_api.dart';
import 'package:client/features/admin/domain/admin_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('mock admin api supports login and CRUD basics', () async {
    final api = MockAdminApi();

    final tokens = await api.login(
      username: AppConstants.mockAdminUsername,
      password: AppConstants.mockAdminPassword,
      deviceId: 'test-admin-device',
    );

    final profile = await api.me(tokens.accessToken);
    expect(profile.role, 'admin');

    final account = await api.createAccount(
      const ManagedAccountCreateInput(
        username: 'alpha_user',
        displayName: 'Alpha User',
        password: 'Password123',
        status: 'active',
      ),
    );
    expect(account.username, 'alpha_user');

    final updatedAccount = await api.updateAccount(
      account.id,
      const ManagedAccountUpdateInput(
        displayName: 'Alpha User 2',
        status: 'disabled',
      ),
    );
    expect(updatedAccount.status, 'disabled');

    final prefix = await api.createDialPrefix(
      const ManagedDialPrefixUpsertInput(
        countryCode: 'CN',
        carrierName: 'CMCC',
        prefix: '#31#',
        priority: 80,
        status: 'active',
        remark: 'test',
      ),
    );
    final updatedPrefix = await api.updateDialPrefix(
      prefix.id,
      const ManagedDialPrefixUpsertInput(
        countryCode: 'CN',
        carrierName: 'CMCC',
        prefix: '*67',
        priority: 60,
        status: 'disabled',
        remark: 'updated',
      ),
    );
    expect(updatedPrefix.prefix, '*67');

    final notice = await api.createNotice(
      const ManagedNoticeUpsertInput(
        title: 'notice',
        content: 'content',
        type: 'info',
        status: 'active',
      ),
    );
    final updatedNotice = await api.updateNotice(
      notice.id,
      const ManagedNoticeUpsertInput(
        title: 'notice 2',
        content: 'content 2',
        type: 'warning',
        status: 'disabled',
      ),
    );
    expect(updatedNotice.type, 'warning');
    expect((await api.listAccounts()).isNotEmpty, isTrue);
    expect((await api.listDialPrefixes()).isNotEmpty, isTrue);
    expect((await api.listNotices()).isNotEmpty, isTrue);
  });
}
