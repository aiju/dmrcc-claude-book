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
sob	r3,L4
jmp	cret
.globl	_sum
.text
_sum:
~~sum:
~p=r4
~s=r3
jsr	r5,csv
clr	r3
mov	$_v,r4
L20001:tst	(r4)
jeq	L9
add	(r4),r3
jbr	L8
L9:dec	r3
L8:add	$2,r4
cmp	$310+_v,r4
jhi	L20001
mov	r3,r0
jmp	cret
.globl
.data
