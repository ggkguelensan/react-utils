import { withHook as rootWithHook, pipe as rootPipe } from '@ggkguelensan/react-utils';
import { withHook } from '@ggkguelensan/react-utils/with-hook';
import { pipe } from '@ggkguelensan/react-utils/pipe';

const sameHook: typeof rootWithHook = withHook;
const samePipe: typeof rootPipe = pipe;
export { sameHook, samePipe };
