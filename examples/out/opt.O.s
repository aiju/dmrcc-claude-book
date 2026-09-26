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
mov	(pc),6(r0)
mov	_y,r0
add	_z,r0
mov	r0,_x
jeq	L2
mov	$1,_y
L2:tst	_z
jeq	L3
mov	$1,_x
jbr	L20000
L3:mov	$3,_x
L20000:mov	$2,_y
jbr	L5
L20002:tst	_y
jne	L7
dec	_x
L5:tst	_x
jne	L20002
L7:clr	_z
jmp	cret
.globl
.data
