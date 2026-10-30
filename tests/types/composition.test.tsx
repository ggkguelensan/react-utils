import { createRef, forwardRef, memo, useState } from 'react';
import type { ComponentProps, ComponentType, ReactElement } from 'react';
import { pipe, withHook } from '@ggkguelensan/react-utils';

type Equal<Left, Right> = (<T>() => T extends Left ? 1 : 2) extends
  (<T>() => T extends Right ? 1 : 2) ? true : false;
type Expect<Value extends true> = Value;
type IsAny<Value> = 0 extends (1 & Value) ? true : false;

function HeaderView(props: {
  title: string;
  subtitle: string;
  onClose: () => void;
}): ReactElement {
  return <button onClick={props.onClose}>{props.title}{props.subtitle}</button>;
}

const withTitle = withHook(({ eventId }: { eventId: number }) => ({
  title: String(eventId),
}));

const Header = withTitle(HeaderView);
<Header eventId={1} subtitle="Almaty" onClose={() => {}} />;
// @ts-expect-error required hook input
<Header subtitle="Almaty" onClose={() => {}} />;
// @ts-expect-error required passthrough prop
<Header eventId={1} onClose={() => {}} />;
// @ts-expect-error wrong hook input
<Header eventId="1" subtitle="Almaty" onClose={() => {}} />;
// @ts-expect-error injected prop is not an external prop
<Header eventId={1} title="override" subtitle="Almaty" onClose={() => {}} />;
// @ts-expect-error incompatible View output
withTitle((props: { title: number }) => <span>{props.title}</span>);

type HeaderProps = ComponentProps<typeof Header>;
type HeaderInput = Expect<Equal<HeaderProps['eventId'], number>>;
type HeaderPassthrough = Expect<Equal<HeaderProps['subtitle'], string>>;
type HeaderNotAny = Expect<Equal<IsAny<HeaderProps>, false>>;
type InjectedIsRemoved = Expect<Equal<'title' extends keyof HeaderProps ? true : false, false>>;

const Connected = pipe(
  HeaderView,
  withTitle,
  withHook(({ cityId }: { cityId: number }) => ({ subtitle: String(cityId) })),
);
<Connected eventId={1} cityId={2} onClose={() => {}} />;
// @ts-expect-error the first hook input is preserved
<Connected cityId={2} onClose={() => {}} />;
// @ts-expect-error a later hook's input is preserved
<Connected eventId={1} onClose={() => {}} />;
// @ts-expect-error passthrough remains required across the chain
<Connected eventId={1} cityId={2} />;
// @ts-expect-error saturated props are removed from the outer API
<Connected eventId={1} cityId={2} subtitle="x" onClose={() => {}} />;
type ConnectedNotAny = Expect<Equal<IsAny<ComponentProps<typeof Connected>>, false>>;
// @ts-expect-error incompatible HOC step cannot fall back to any
pipe(HeaderView, withTitle, (view: ComponentType<{ unrelated: boolean }>) => view);

const identity = <Value,>(value: Value): Value => value;
const Long = pipe(HeaderView, withTitle, identity, identity, identity, identity, identity, identity);
<Long eventId={1} subtitle="x" onClose={() => {}} />;
// @ts-expect-error props stay checked in a longer chain
<Long />;

function CountView(props: { count: number | undefined }): ReactElement {
  return <span>{props.count}</span>;
}
const Count = withHook(({ initial }: { initial: number }) => {
  const [count] = useState(initial);
  return { count };
})(CountView);
<Count initial={1} />;
const MemoCount = withHook(() => ({ count: 1 }))(memo(CountView));
<MemoCount />;
const RefView = forwardRef<HTMLButtonElement, { title: string }>((props, ref) =>
  <button ref={ref}>{props.title}</button>,
);
const NoRefForwarding = withHook(() => ({ title: 'hello' }))(RefView);
<NoRefForwarding />;
// @ts-expect-error ref forwarding is explicitly outside the contract
<NoRefForwarding ref={createRef<HTMLButtonElement>()} />;
withHook(() => ({ count: undefined as number | undefined }))(
  // @ts-expect-error maybe-undefined output cannot satisfy a required number
  (props: { count: number }) => <span>{props.count}</span>,
);
// @ts-expect-error a primitive is not an injected props object
withHook(() => 42);
// @ts-expect-error null is not an injected props object
withHook(() => null);
// @ts-expect-error hooks must return props synchronously
withHook(async () => ({ title: 'async' }));
// @ts-expect-error return a props object instead of an array
withHook(() => [1, 2]);
// @ts-expect-error return a props object instead of a callback
withHook(() => () => 42);
withHook(() => ({ onSelect: (id: number) => {} }))(
  // @ts-expect-error callback arguments are checked
  (props: { onSelect: (id: string) => void }) => <span />,
);

const SameName = withHook((props: { value: string }) => ({ value: Number(props.value) }))(
  (props: { value: number }) => <span>{props.value}</span>,
);
<SameName value="1" />;
// @ts-expect-error input type wins when an input is transformed under the same name
<SameName value={1} />;

const Optional = withHook(() => ({ title: 'hello' }))(
  (props: { title: string; subtitle?: string }) => <span>{props.title}{props.subtitle}</span>,
);
<Optional />;
<Optional subtitle="optional" />;
// @ts-expect-error optional passthrough keeps its value type
<Optional subtitle={1} />;

const UnionInput = withHook((props: { kind: 'id'; id: number } | { kind: 'slug'; slug: string }) => ({
  title: props.kind === 'id' ? String(props.id) : props.slug,
}))(HeaderView);
<UnionInput kind="id" id={1} subtitle="x" onClose={() => {}} />;
// @ts-expect-error input discriminant and payload stay correlated
<UnionInput kind="id" slug="x" subtitle="x" onClose={() => {}} />;

const UnionView = withHook(() => ({ title: 'hello' }))(
  (props: { title: string } & ({ kind: 'id'; id: number } | { kind: 'slug'; slug: string })) =>
    <span>{props.title}</span>,
);
<UnionView kind="slug" slug="x" />;
// @ts-expect-error passthrough union is not flattened
<UnionView kind="slug" id={1} />;

const useUnion = (): { kind: 'ok'; value: number } | { kind: 'error'; message: string } =>
  ({ kind: 'ok', value: 1 });
const UnionOutput = withHook(useUnion)(
  (props: ReturnType<typeof useUnion>) => <span>{props.kind}</span>,
);
<UnionOutput />;
// @ts-expect-error branch-specific injected fields are removed too
<UnionOutput value={1} />;

const useBadUnion = (): { title: string } | { title: number } => ({ title: 1 });
// @ts-expect-error every injected union branch must satisfy the View
withHook(useBadUnion)(HeaderView);

const useOptionalTitle = (): { title?: string } => ({});
// @ts-expect-error an optionally supplied field cannot fill a required title
withHook(useOptionalTitle)(HeaderView);

// @ts-expect-error a subsequent HOC has no saturated title in its input contract
withHook((props: { eventId: number }) => ({ subtitle: props.title }));

export type Checks = HeaderInput | HeaderPassthrough | HeaderNotAny | InjectedIsRemoved | ConnectedNotAny;
