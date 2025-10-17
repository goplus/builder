package main

import (
	"fmt"
	"runtime"
	"time"
)

func main() {
	fmt.Println("Go version:")
	fmt.Println(runtime.Version())

	// Generate simple logs every second
	for i := 1; ; i++ {
		fmt.Printf("[LOG] Game tick %d - Player moved, score updated\n", i)
		time.Sleep(1 * time.Second)

		// Simulate occasional error
		if i%5 == 0 {
			fmt.Printf("[ERROR] Simulated error at tick %d\n", i)
		}
	}
}
