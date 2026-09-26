.globl	_main
.text
_main:
~~main:
~a=177770
~b=177766
jsr	r5,csv
sub	$4,sp
mov	$1,-10(r5)
mov	$3,-12(r5)
cmp	$3,$3
jeq	L10000
clr	(sp)
jbr	L10001
L10000:mov	$1,(sp)
L10001:bic	$-7,(sp)
clr	-(sp)
mov	$L2,-(sp)
jsr	pc,*$_printf
cmp	(sp)+,(sp)+
inc	-12(r5)
mov	-12(r5),(sp)
add	-10(r5),(sp)
inc	-10(r5)
mov	$L3,-(sp)
jsr	pc,*$_printf
tst	(sp)+
mov	-12(r5),(sp)
mov	-10(r5),-(sp)
mov	$L4,-(sp)
jsr	pc,*$_printf
cmp	(sp)+,(sp)+
jmp	cret
.globl
.data
L2:.byte 45,144,40,45,144,12,0
L3:.byte 45,144,12,0
L4:.byte 45,144,40,45,144,12,0
