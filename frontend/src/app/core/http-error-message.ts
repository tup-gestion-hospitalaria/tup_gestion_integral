import { HttpErrorResponse } from '@angular/common/http';

export type HttpErrorContext =
  | 'items'
  | 'patient'
  | 'referral'
  | 'referralCenters'
  | 'referralCreate'
  | 'referralTransition'
  | 'generic';

export function httpErrorMessageKey(error: HttpErrorResponse, context: HttpErrorContext): string {
  switch (error.status) {
    case 401:
      return 'ERRORS.AUTH';
    case 403:
      return context === 'referral' ? 'REFERRAL.PERMISSION_ERROR' : 'ERRORS.FORBIDDEN';
    case 404:
      if (context === 'patient') {
        return 'PATIENT.NOT_FOUND';
      }
      if (context === 'referral' || context === 'referralCreate') {
        return 'REFERRAL.NOT_FOUND';
      }
      if (context === 'referralCenters') {
        return 'REFERRAL_CENTERS.LOAD_ERROR';
      }
      return 'ERRORS.NOT_FOUND';
    case 400:
      return context === 'patient' ? 'PATIENT.SAVE_ERROR' : 'ERRORS.GENERIC';
    case 409:
      return 'PATIENT.VERSION_CONFLICT';
    default:
      break;
  }

  switch (context) {
    case 'items':
      return 'ITEMS.LOAD_ERROR';
    case 'patient':
      return 'PATIENT.LOAD_ERROR';
    case 'referralCenters':
      return 'REFERRAL_CENTERS.LOAD_ERROR';
    case 'referralCreate':
      return 'REFERRAL.CREATE_ERROR';
    case 'referralTransition':
      return 'REFERRAL.TRANSITION_ERROR';
    case 'referral':
      return 'REFERRAL.LOAD_ERROR';
    default:
      return 'ERRORS.GENERIC';
  }
}
