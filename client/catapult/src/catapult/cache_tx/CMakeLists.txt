cmake_minimum_required(VERSION 3.14)

catapult_library_target(catapult.cache_tx)
if(USE_JNI)
target_link_libraries(catapult.cache_tx catapult.utils catapult.crypto catapult.model)
else()
target_link_libraries(catapult.cache_tx catapult.utils)
endif()
