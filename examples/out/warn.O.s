.globl	_main
.text
_main:
~~main:
~x=177770
~y=177766
jsr	r5,csv
sub	$4,sp
dec	-10(r5)
dec	-12(r5)
mov	-12(r5),(sp)
mov	-10(r5),-(sp)
mov	$L2,-(sp)
jsr	pc,*$_printf
cmp	(sp)+,(sp)+
jmp	cret
.globl
.data
L2:.byte 45,144,40,45,144,12,0
