.globl	_v
.comm	_v,310
.globl	_clear
.text
_clear:
~~clear:
~n=r3
~p=r4
jsr	r5,csv
mov	$_v,r4
mov	$144,r3
L4:clr	(r4)+
L2:dec	r3
jne	L4
L3:L1:jmp	cret
.globl	_sum
.text
_sum:
~~sum:
~p=r4
~s=r3
jsr	r5,csv
clr	r3
mov	$_v,r4
L6:cmp	$310+_v,r4
jlos	L7
tst	(r4)
jeq	L9
add	(r4),r3
jbr	L10
L9:dec	r3
L10:L8:add	$2,r4
jbr	L6
L7:mov	r3,r0
jbr	L5
L5:jmp	cret
.globl
.data
