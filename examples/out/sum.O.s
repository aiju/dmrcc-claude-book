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
L20001:mov	-10(r5),r1
mul	r1,r1
add	r1,-12(r5)
inc	-10(r5)
cmp	$12,-10(r5)
jgt	L20001
mov	-12(r5),(sp)
mov	$L5,-(sp)
jsr	pc,*$_printf
tst	(sp)+
jmp	cret
.globl
.data
L5:.byte 45,144,12,0
