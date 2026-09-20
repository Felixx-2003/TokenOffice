/** Make Space harvest anywhere in the game, even after another button has focus. */
export function installHarvestShortcut(target: Window, harvest: () => void): void {
  const onSpace = (event: KeyboardEvent): void => {
    if (event.code !== 'Space' && event.key !== ' ') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;

    // Suppress both scrolling and the focused button's native Space activation.
    event.preventDefault();
    if (event.type === 'keydown') harvest();
  };

  target.addEventListener('keydown', onSpace, true);
  target.addEventListener('keyup', onSpace, true);
}
