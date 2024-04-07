cmake_minimum_required(VERSION 3.23)

catapult_library_target(catapult.state)
if(USE_JNI)
target_link_libraries(catapult.state catapult.model)
endif()
