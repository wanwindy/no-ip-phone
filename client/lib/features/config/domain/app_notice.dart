enum AppNoticeType { info, warning, critical }

class AppNotice {
  const AppNotice({
    required this.title,
    required this.content,
    required this.type,
  });

  final String title;
  final String content;
  final AppNoticeType type;
}
