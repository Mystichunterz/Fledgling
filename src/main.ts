import Phaser from 'phaser';
import { gameConfig } from './config';
import { _debugTransitionState, _debugResetTransition } from './engine/transitions';
import { GameRegistry } from './state/GameRegistry';

new Phaser.Game(gameConfig);

// Dev console helpers — type `window.__fledgling.state()` etc.
(window as Window & { __fledgling?: unknown }).__fledgling = {
  state: () => ({ ..._debugTransitionState(), ...GameRegistry }),
  resetTransition: _debugResetTransition,
};
