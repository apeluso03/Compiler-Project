function test_pass_unary(): i32 {
let i: i32 = -1;

let b: bool = !false;

return i;
}
export function main(): i32 {
return test_pass_unary();
}
