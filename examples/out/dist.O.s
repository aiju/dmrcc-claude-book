.globl	_m
.comm	_m,310
.globl	_a
.comm	_a,2
.globl	_b
.comm	_b,2
.globl	_x
.comm	_x,2
.globl	_f
.text
_f:
~~f:
~i=4
~j=6
jsr	r5,csv
mov	4(r5),r1
mul	$12,r1
add	6(r5),r1
asl	r1
mov	_m(r1),_x
mov	_b,r0
add	_a,r0
ash	$2,r0
mov	r0,_x
mov	_a,r1
mul	$3,r1
add	_b,r1
asl	r1
mov	r1,_x
mov	_a,r1
add	$3,r1
mul	$5,r1
mov	r1,_x
jmp	cret
.globl
.data
