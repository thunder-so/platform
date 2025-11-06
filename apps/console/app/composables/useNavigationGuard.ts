import { onBeforeRouteLeave } from 'vue-router';
import { AppNavigationGuardModal } from '#components';

export const useNavigationGuard = (isDirty: Ref<boolean>) => {
  const overlay = useOverlay();

  onBeforeRouteLeave(() => {
    if (!isDirty.value) return true;

    return new Promise((resolve) => {
      const modal = overlay.create(AppNavigationGuardModal, {
        props: {
          onDiscard: () => {
            resolve(true);
          },
          onKeepEditing: () => {
            resolve(false);
          }
        }
      });

      modal.open();
    });
  });
};