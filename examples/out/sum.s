.globl	_main
.text
_main:
~~main:
~i=177770
~s=177766
jsr	r5,csv
sub	$4,sp
clr	-12(r5)
clr	-10(r5)
L2:cmp	$12,-10(r5)
jle	L3
mov	-10(r5),r1
mul	-10(r5),r1
add	r1,-12(r5)
L4:inc	-10(r5)
jbr	L2
L3:mov	-12(r5),(sp)
mov	$L5,-(sp)
jsr	pc,*$_printf
tst	(sp)+
L1:jmp	cret
.globl
.data
L5:.byte 45,144,12,0
