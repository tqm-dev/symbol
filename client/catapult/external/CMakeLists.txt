cmake_minimum_required(VERSION 3.23)
project(external)
add_definitions(-DNO_MISALIGNED_ACCESSES) # sha3

file(GLOB external_donna_SRC
	"donna/*.c"
	"donna/*.h"
)

SOURCE_GROUP("donna" FILES ${external_donna_SRC})

if(USE_JNI)
add_library(external
	SHARED
	${external_donna_SRC}
	README.txt) 
else()
add_library(external
	${external_donna_SRC}
	README.txt)
endif()

catapult_add_openssl_dependencies(external)

set_property(TARGET external PROPERTY POSITION_INDEPENDENT_CODE ON)
