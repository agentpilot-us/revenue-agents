/** Fired after Content Library (or related setup) changes so SetupProgressCard refetches. */
export const MY_COMPANY_SETUP_PROGRESS_INVALIDATE = 'my-company-setup-progress-invalidate';

export function dispatchMyCompanySetupProgressInvalidate() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MY_COMPANY_SETUP_PROGRESS_INVALIDATE));
}
