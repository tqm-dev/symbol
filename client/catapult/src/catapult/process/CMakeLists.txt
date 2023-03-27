cmake_minimum_required(VERSION 3.14)

catapult_library_target(catapult.process)
if(USE_JNI)
target_link_libraries(catapult.process
	catapult.version
	catapult.local.server
	catapult.local.recovery
	catapult.local.importer
	catapult.local.broker)
else()
target_link_libraries(catapult.process catapult.version)
endif()

add_subdirectory(broker)
add_subdirectory(importer)
add_subdirectory(recovery)
add_subdirectory(server)

install(TARGETS catapult.broker catapult.importer catapult.recovery catapult.server)
