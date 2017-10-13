#!/bin/bash

for directory in `find . -type d -maxdepth 1 -mindepth 1`
do
    dirname=${directory:2}
    echo "Packing ${dirname}..."
    tar -zcvf "${dirname}.tar.gz" "${dirname}"    
done
