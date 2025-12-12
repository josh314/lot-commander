import successBeepWav from '../audio/success.wav';
import warningBeepWav from '../audio/fail-1.wav';
import failBeepWav from '../audio/fail-2.wav';

const successBeep = new Audio(successBeepWav);
const warningBeep = new Audio(warningBeepWav);
const failBeep = new Audio(failBeepWav);

export function fail( ) {
  failBeep.play();
}

export function success( ) {
  successBeep.play();
}

export function warning( ) {
  warningBeep.play();
}
