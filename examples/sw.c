dense(n)
{
	switch (n) {
	case 1: return(10);
	case 2: return(20);
	case 4: return(40);
	}
	return(0);
}

few(n)
{
	switch (n) {
	case 1: return(1);
	case 100: return(2);
	case 1000: return(3);
	}
	return(0);
}

many(n)
{
	switch (n) {
	case 3: return(1);
	case 17: return(2);
	case 110: return(3);
	case 250: return(4);
	case 401: return(5);
	case 512: return(6);
	case 777: return(7);
	case 1024: return(8);
	case 2000: return(9);
	case 3000: return(10);
	}
	return(0);
}
