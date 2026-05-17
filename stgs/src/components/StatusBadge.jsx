import { useTranslation } from 'react-i18next'
import { Badge } from './ui.jsx'

export default function StatusBadge({ status, size }) {
  const { t } = useTranslation()
  return <Badge tone={toneFor(status)} size={size} dot>{t('status.' + status, status)}</Badge>
}

function toneFor(s) {
  switch (s) {
    case 'Draft': return 'neutral'
    case 'Submitted': return 'info'
    case 'InReview': return 'info'
    case 'Returned': return 'warning'
    case 'Approved': return 'success'
    case 'AdvancePaid': return 'accent'
    case 'AwaitingReconciliation': return 'warning'
    case 'Completed': return 'success'
    case 'Cancelled': return 'neutral'
    case 'Rejected': return 'danger'
    default: return 'neutral'
  }
}
