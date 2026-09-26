.globl	_tab
.comm	_tab,214
.globl	_fp
.comm	_fp,2
.globl	_argv
.comm	_argv,10
.globl	_matrix
.comm	_matrix,30
.globl	_main
.text
_main:
~~main:
~np=177770
jsr	r5,csv
tst	-(sp)
mov	$34+_tab,-10(r5)
mov	$2,(sp)
mov	$30,-(sp)
mov	$16,-(sp)
mov	$L2,-(sp)
jsr	pc,*$_printf
add	$6,sp
mov	-10(r5),r0
add	$6,r0
sub	-10(r5),r0
asr	r0
mov	r0,(sp)
mov	-10(r5),r0
add	$4,r0
sub	-10(r5),r0
asr	r0
mov	r0,-(sp)
mov	$L3,-(sp)
jsr	pc,*$_printf
cmp	(sp)+,(sp)+
mov	-10(r5),r0
mov	4(r0),(sp)
bic	$-10,(sp)
mov	$L4,-(sp)
jsr	pc,*$_printf
tst	(sp)+
L1:jmp	cret
.globl
.data
L2:.byte 45,144,40,45,144,40,45,144,12,0
L3:.byte 45,144,40,45,144,12,0
L4:.byte 45,144,12,0
