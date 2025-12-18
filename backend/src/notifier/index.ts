import { sendMail } from './emailNotifier';

type EventType = 'REQUEST_CREATED' | 'STAGE_TARGET_UPDATED';

type NotifyOptions = {
  type: EventType;
  to?: string | string[];
  data: Record<string, any>;
};

const DEFAULT_TO = process.env.NOTIFY_TO || '';

export async function notifyEvent(opts: NotifyOptions) {
  const recipients = opts.to || DEFAULT_TO;
  if (!recipients) {
    // No recipients configured; silent skip
    console.log('[notifier] No recipients configured. Event skipped.', opts.type);
    return;
  }

  const subject = subjectFor(opts.type, opts.data);
  const body = bodyFor(opts.type, opts.data);

  try {
    await sendMail({ to: recipients, subject, text: body });
  } catch (e) {
    console.error('[notifier] Failed to send mail', e);
  }
}

function subjectFor(type: EventType, data: Record<string, any>) {
  switch (type) {
    case 'REQUEST_CREATED':
      return `[R&D 요청 등록] ${data.title || data.id || ''}`;
    case 'STAGE_TARGET_UPDATED':
      return `[R&D 목표일 변경] ${data.title || data.id || ''} (${data.stage || ''})`;
    default:
      return `[알림] ${type}`;
  }
}

function bodyFor(type: EventType, data: Record<string, any>) {
  switch (type) {
    case 'REQUEST_CREATED':
      return [
        `제목: ${data.title}`,
        `작성자: ${data.createdByName || data.createdByUserId || '-'}`,
        `제품군: ${data.productArea || '-'}`,
        `중요도: ${data.importanceFlag || '-'}`,
        `고객 마감일: ${data.customerDeadline || '-'}`,
        `바로가기: ${data.detailUrl || '-'}`,
      ].join('\n');
    case 'STAGE_TARGET_UPDATED':
      return [
        `요청 ID: ${data.id}`,
        `제목: ${data.title}`,
        `단계: ${data.stage}`,
        `새 목표일: ${data.targetDate}`,
        `이전 목표일: ${data.previousTarget || '-'}`,
        `변경자: ${data.changedByName || data.changedByUserId || '-'}`,
        `바로가기: ${data.detailUrl || '-'}`,
      ].join('\n');
    default:
      return JSON.stringify(data, null, 2);
  }
}
