.globl	_p
.comm	_p,2
.globl	_x
.comm	_x,2
.globl	_y
.comm	_y,2
.globl	_z
.comm	_z,2
.globl	_f
.text
_f:
~~f:
jsr	r5,csv
mov	_p,r0
mov	$6,6(r0)
mov	_y,r0
add	_z,r0
mov	r0,_x
tst	_x
jeq	L2
mov	$1,_y
L2:tst	_z
jeq	L3
mov	$1,_x
mov	$2,_y
jbr	L4
L3:mov	$3,_x
mov	$2,_y
L4:L5:tst	_x
jeq	L6
tst	_y
jne	L7
dec	_x
jbr	L5
L6:L7:clr	_z
L1:jmp	cret
.globl
.data
