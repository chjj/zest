all:
	@cp lib/zest.js zest.js
	@uglifyjs -mt --unsafe -o zest.min.js zest.js

clean:
	@rm zest.js
	@rm zest.min.js

.PHONY: clean all
