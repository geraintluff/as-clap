let modulePath = "";
export {modulePath};

export function fnPtr<F>(fn : F) : usize {
	return load<usize>(changetype<usize>(fn));
}
export function objPtr<V>(v : V) : usize {
	return changetype<usize>(v);
}
const EXPLICIT_GARBAGE_COLLECTION = true;
@inline
export function gc() : void {
	if (EXPLICIT_GARBAGE_COLLECTION) __collect();
}
@inline
export function gcThen<V>(v : V) : V {
	if (EXPLICIT_GARBAGE_COLLECTION) __collect();
	return v;
}